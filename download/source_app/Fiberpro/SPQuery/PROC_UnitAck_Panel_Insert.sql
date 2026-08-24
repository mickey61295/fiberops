/*;=============================================   



; Author           :  Global Software's    



; Create date      :  17/08/2022    



; Create By        :  ASLAM  



; Description      :  PANEL_Stock  



; Change Person    :  ASLAM



; Last Change Date :  14/06/2023 10.00 AM 



; =============================================  */  


CREATE PROCEDURE PROC_UnitAck_Panel_Insert (@Id Int,@StyleNo Varchar(20),@PartID Int,@ColId Int,@SizeId Int,@Pcs Int,@LotNo Varchar(15) ,@TransID Int,@compID int) AS  DECLARE @Coycode Int, @Partyid Int,@OrdId Int,@StageId Int,@GodId Int,@StockQty Int,@PcsStockId Int,@SeqNo  int ,@ProcessType Char(1),@RejectionTypeId int ,@LotId Int ,@DelType Varchar(30)



  SELECT @Coycode = Coycode From Trs_UnitAck1 Where Id=@Id    

  SELECT @DelType = Rtrim(isnull(Deltype,'')) from Trs_Pcs1 where Id = @TransID 


  SELECT @PartyId = 0    



  SELECT @Ordid = Ordjobno From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId Where Trs_UnitAck2.Id=@Id    and transid = @TransID and StyleNo=@StyleNo 

  print 'ss'
  print @deltype

  if Rtrim(@DelType) = 'Unit Transfer-Panel' 
  BEGIN
  SELECT @StageId = Trs_Pcs2.SourceStageID From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId 
INNER JOIN Trs_Pcs2 ON Trs_Pcs1.Id = Trs_Pcs2.ID And Trs_Pcs2.StyleNo = Trs_UnitAck2.StyleNo And Trs_Pcs2.ColID = Trs_UnitAck2.ColID 
And Trs_Pcs2.SizeID = Trs_UnitAck2.SizeID and trs_Pcs2.PartID = Trs_UnitAck2.PartID And Trs_Pcs2.LotNo = Trs_UnitAck2.LotNo   Where Trs_UnitAck2.Id=@Id  and transid = @TransID and Trs_Pcs2.StyleNo=@StyleNo   and Trs_Pcs2.partId=@PartID And Trs_Pcs2.ColID = @ColId And Trs_Pcs2.SizeID = @SizeId And Trs_Pcs2.CompID =@compID 
  END
  ELSE
  BEGIN 
  SELECT @StageId = TargetStageID From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId Where Trs_UnitAck2.Id=@Id  and transid = @TransID and StyleNo=@StyleNo   
  END 

  
  print @StageId 


  SELECT @StockQty = @Pcs  



  SELECT @GodId = GodId From Trs_UnitAck1 Where Id=@Id   



  Select @SeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@OrdId And Prod_Sequence.StyleNo=@StyleNo And Prod_Sequence.StageId=@StageId    
  SELECT @RejectionTypeId = RejectionTypeId from trs_pcs1 where id=@id   

  SELECT @ProcessType = ProcessType From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId Where Trs_UnitAck2.Id=@Id     and transid = @TransID and StyleNo=@StyleNo  



  

  /*

  SELECT @compID = ISNull(CompId,0) From Trs_Pcs1 Inner Join Trs_UnitAck2 On Trs_Pcs1.Id=Trs_UnitAck2.TransId Where Trs_UnitAck2.Id=@Id     and transid = @TransID and StyleNo=@StyleNo   */







 







  if ltrim(@LotNo)<>''  

  SELECT @LotID = LotSno from mas_Lot where LotName =LTrim(@LotNo)  

  ELSE  

  SELECT @LotId = 0   

  Begin   

  If EXISTS (select * from Panel_StockTable where coycode=@coycode and Ordid=@Ordid and LotID = @LotID and StyleNo=@StyleNo and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId)   

  begiN   

  Select @PcsStockId=PcsStockId From Panel_StockTable where coycode=@coycode and Ordid=@Ordid and LotID = @LotID and StyleNo=@StyleNo and Stageid=@Stageid and PartId=@PartId and

 GodId=@GodId and PartyId=@PartyId   

 If EXISTS



 (select * from Panel_StockTable Inner Join Panel_StockTableQty On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@Stageid and PartId=@PartId and GodId


=@GodId 



and PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and GoodPcsFlag ='G' and Panel_StockTableQty.CompID=@compID)  

Begin   

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty

+@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@Stageid and PartId=@PartId and GodId


=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompID=@compID  and GoodPcsFlag ='G' 

End   

Else     

Begin    

INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty

,GoodPcsFlag,RejectionTypeId,CompId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When @ProcessType='P'



 Then 'G' Else 'M' End,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End,@compID)    End  End  Else    begin    
 print 'aslam'
 Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Panel_StockTable   

 INSERT INTO Panel_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID) VALUES (@Coycode,@Ordid,@StyleNo,@Stageid,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId,@LotID)   

 INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId,CompId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When @ProcessType='P' Then 'G' Else 'M' End,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End,@compID)   End   End 
