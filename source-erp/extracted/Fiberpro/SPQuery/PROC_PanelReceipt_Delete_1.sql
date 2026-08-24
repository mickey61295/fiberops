/*;=============================================   

; Author           :  Global Software's    

; Create date      :  17/08/2022    

; Create By        :  ASLAM  

; Description      :  PANEL_Stock  

; Change Person    :  SWETHA

; Last Change Date :  05/07/2023 09.15 AM 

; =============================================  */  


CREATE PROCEDURE PROC_PanelReceipt_Delete_1 (@ID Int,@StyleNo Varchar(20),@PartId int,@ColId Int,@SizeId Int,@Pcs Int,@LotNo Varchar(15),@CompID INT) AS DECLARE @Ordid Int,@StageId Int,@GodId Int,@StockQty Int,@SourceStageId Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int,@StageId1 Int,@GrnType varchar(20),@ProcessType Char(1),@RejectionTypeId Int ,@DCTargetStageId int ,@LotId int,@coycode int,@PanelId Int,@SemiFinishDept Varchar(1)

Select @Id=@ID    

Select @Coycode = Coycode FROM Trs_PcsGrn1 where id=@id       

select @Partyid = Party from Trs_PcsGrn1 where id=@id     

SELECT @Ordid = OrdJob from Trs_PcsGrn1 where id=@id     

SELECT @StyleNo = @StyleNo   

SELECT @Stageid = TargetStageID from Trs_PcsGrn1 where id=@id     

SELECT @PartId = @PartId   

SELECT @GodId = GodId from Trs_PcsGrn1 where id=@id   

SELECT @ProcessType = ProcessType from Trs_PcsGrn1 where id=@id     

SELECT @RejectionTypeId = Trs_Pcs1.RejectionTypeId from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.lotNo = Trs_PcsGrn2.LotNo and IsNull(Trs_Pcs2.CompID,0) =isnull(Trs_PcsGrn2.CompID,0) where Trs_PcsGrn1.id=@id  

/*

SELECT @CompID = isNull(CompId,0) from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And 
Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.lotNo = Trs_PcsGrn2.LotNo where Trs_PcsGrn1.id=@id  */

Select @SeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@OrdId And Prod_Sequence.StyleNo=@StyleNo And Prod_Sequence.StageId=@Stageid    

SELECT @colid = @Colid   SELECT @Sizeid = @Sizeid   

SELECT @StockQty = @Pcs   

SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_PcsGrn1 Inner Join Mas_JobWrkComp On Trs_PcsGrn1.TargetStageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_PcsGrn1.Id=@Id     

Select @GrnType = GrnType from trs_pcsgrn1 where id=@id    

Select @SemiFinishDept=Mas_Dept.SEMIFINISH From Mas_Dept INNER JOIN Trs_PcsGrn1 ON Trs_PcsGrn1.Dept=Mas_Dept.DeptID Where Trs_PcsGrn1.ID=@Id     

If @SemiFinishDept='F'    

BEGIN  

SELECT @DCTargetStageId = Trs_Pcs1.TargetStageID from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And   Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.lotNo = Trs_PcsGrn2.LotNo and IsNull(Trs_Pcs2.CompID,0) =isnull(Trs_PcsGrn2.CompID,0) Where Trs_PcsGrn1.id=@id  

 END     

Else  

BEGIN   

SELECT @DCTargetStageId = Trs_Pcs1.TargetStageID from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join   trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.lotNo = Trs_PcsGrn2.LotNo and IsNull(Trs_Pcs2.CompID,0) =isnull(Trs_PcsGrn2.CompID,0) Where Trs_PcsGrn1.id=@id 

END     

 BEGIN   
 
DECLARE LINE_CURSOR_DEL CURSOR FOR      

Select Id,StyleNo,Colid,PartId,SizId,IsNull(lotNo,'') LotNo,RecPcs,PanelID,IsNull(CompId,0) as CompID FROM Trs_PcsGrn2 Where ID=@Id And StyleNo=@StyleNo and Colid =	 @ColId and PartId = @PartId And SizId =@SizeId  and LotNo =@LotNo And IsNull(CompID,0) = @CompID

OPEN 	 LINE_CURSOR_DEL  	  

FETCH NEXT FROM LINE_CURSOR_DEL INTO @Id,@StyleNo,@Colid,@PartId,@SizeId,@LotNo,@Pcs,@PanelId,@compID

WHILE @@FETCH_STATUS = 0    	  

BEGIN   

if ltrim(@LotNo)<>'' 	 

SELECT @LotID = LotSno from mas_Lot where LotName =LTrim(@LotNo)	

else 			  

SELECT @LotId = 0   	    

If @GrnType='Process Return'   

Begin   		

 If @SemiFinishDept='F'      
 
Select @StageId1 = Trs_Pcs1.TargetStageId from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id 		 Inner Join trs_pcsgrn1 On Trs_Pcs1.Ordjobno=  Trs_PcsGrn1.OrdJob Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And   Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And 		 Trs_Pcs2.lotNo = Trs_PcsGrn2.LotNo and IsNull(Trs_Pcs2.CompID,0) =isnull(Trs_PcsGrn2.CompID,0) Where Trs_PcsGrn1.id=@id  

Else  

Select @StageId1 = Trs_Pcs1.TargetStageId from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=  Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.lotNo = Trs_PcsGrn2.LotNo and IsNull(Trs_Pcs2.CompID,0) =isnull(Trs_PcsGrn2.CompID,0) where Trs_PcsGrn1.id=@id   

print @StageId1
print '@StageId1'
End  

Else  

Begin 

SELECT @StageId1 = TargetStageId From Trs_PcsGrn1 Where Id=@Id  

End   

BEGIN  

 If @FinalStage='S'  
 
Begin   

If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId1)='Panel'  Begin 	  

  if @DCTargetStageId <> @StageId 
  
 begin 
 
 if @ProcessType='R' 
 
begin  UPDATE Panel_StockTableQty    SET StockQty=Panel_StockTableQty.StockQty+ @Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Panel_StockTable.Coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Panel_StockTable.StageId=@DCTargetStageId And Panel_StockTable.GodId=Trs_PcsGrn1.GodId Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id = Trs_PcsGrn2.Id And Panel_StockTable.StyleNo=		Trs_PcsGrn2.StyleNo And Panel_StockTable.PartId=Trs_PcsGrn2.PartId And Panel_StockTableQty.ColId=Trs_PcsGrn2.ColId And Panel_StockTableQty.SizeId=Trs_PcsGrn2.SizId And Panel_StockTable.LotID = @LotId AND Panel_StockTableQty.CompId = Trs_PcsGrn2.CompID   		 WHERE Panel_StockTable.coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Panel_StockTable.StyleNo=Trs_PcsGrn2.StyleNo and Panel_StockTable.Stageid=@DCTargetStageId And Panel_StockTable.PartId=Trs_PcsGrn2.PartId and Panel_StockTable.GodId=Trs_PcsGrn1.GodId and Panel_StockTableQty.Colid=Trs_PcsGrn2.ColId and Panel_StockTableQty.SizeId=Trs_PcsGrn2.SizId and Panel_StockTableQty.CompId=@compID and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId and Partyid=Trs_PcsGrn1.Party And Trs_PcsGrn1.Id=@Id  

end  

else 

begin  

 If @GrnType<>'Process Return'    
 
begin   

UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty+@Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Panel_StockTable.Coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Panel_StockTable.StageId=@DCTargetStageId And Panel_StockTable.GodId=Trs_PcsGrn1.GodId Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Panel_StockTable.StyleNo=Trs_PcsGrn2.StyleNo And Panel_StockTable.PartId=Trs_PcsGrn2.PartId And Panel_StockTableQty.ColId=Trs_PcsGrn2.ColId And Panel_StockTableQty.SizeId=Trs_PcsGrn2.SizId and Panel_StockTableQty.CompId = Trs_PcsGrn2.CompID AND Panel_StockTableQty.CompId=@compID WHERE Panel_StockTable.coycode= Trs_PcsGrn1.Coycode And Panel_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Panel_StockTable.StyleNo=Trs_PcsGrn2.StyleNo and Panel_StockTable.Stageid=@DCTargetStageId And Panel_StockTable.PartId=Trs_PcsGrn2.PartId and Panel_StockTable.GodId=Trs_PcsGrn1.GodId and Panel_StockTableQty.Colid=Trs_PcsGrn2.ColId and Panel_StockTableQty.SizeId=Trs_PcsGrn2.SizId and Panel_StockTableQty.CompId=@compID and Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.LotId = @LotID  And Panel_StockTable.PartId=@PartId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.Colid=@ColId  and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and Partyid=Trs_PcsGrn1.Party And Trs_PcsGrn1.Id=@Id    

end   

end   

print 'a'  --swetha
UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty-@Pcs,ProductionQty=Panel_StockTableQty.ProductionQty-@Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Panel_StockTable.Coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Panel_StockTable.GodId=Trs_PcsGrn1.GodId  And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.PartId=@PartId And Panel_StockTableQty.ColId=@ColId And Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID inner join Trs_Pcs1 on Trs_PcsGrn1.Ourdcref = Trs_Pcs1.ID INNER JOIN Trs_Pcs2 on Trs_Pcs2.ID = Trs_Pcs1.ID and Trs_Pcs2.SourceStageID = Panel_StockTable.StageId and Panel_StockTableQty.SizeId = Trs_Pcs2.SizeID and Panel_StockTableQty.CompId = Trs_Pcs2.CompId WHERE Panel_StockTable.coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Panel_StockTable.StyleNo=@StyleNo and Panel_StockTable.LotID =@LotID  And Panel_StockTable.PartId=@PartId and Panel_StockTable.GodId=Trs_PcsGrn1.GodId and Panel_StockTableQty.Colid=@ColId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID And Panel_StockTable.LotId = @LotID and IsNull(GoodPcsFlag,'G')='G' and IsNull(Panel_StockTableQty.RejectionTypeId,0)=0 and Partyid=0 And Trs_PcsGrn1.Id=@Id  

End  

Else  

Begin 
print 'b'
 UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty-@Pcs,ProductionQty=Panel_StockTableQty.ProductionQty-@Pcs 		  From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Panel_StockTable.Coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Panel_StockTable.StageId=Trs_PcsGrn1.TargetStageId And Panel_StockTable.GodId=Trs_PcsGrn1.GodId And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.PartId=@PartId And Panel_StockTableQty.ColId=@ColId And Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID WHERE Panel_StockTable.coycode=Trs_PcsGrn1.Coycode And 		  Panel_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Panel_StockTable.StyleNo=@StyleNo and Panel_StockTable.LotID =@LotID  and Panel_StockTable.Stageid=Trs_PcsGrn1.TargetStageid And Panel_StockTable.PartId=@PartId and Panel_StockTable.GodId=Trs_PcsGrn1.GodId and 		  Panel_StockTableQty.Colid=@ColId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and Partyid=0 And Trs_PcsGrn1.Id=@Id  

  End 
  
 End 

 If @GrnType='Process Return'    
 
Begin   
print 'c'

UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty+@Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Panel_StockTable.Coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Panel_StockTable.StageId=@StageId1 And Panel_StockTable.GodId=Trs_PcsGrn1.GodId  And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.PartId=@PartId And Panel_StockTableQty.ColId=@ColId And Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 WHERE Panel_StockTable.coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Panel_StockTable.StyleNo=@StyleNo and Panel_StockTable.Stageid=@StageId1 And Panel_StockTable.PartId=@PartId and Panel_StockTable.GodId=Trs_PcsGrn1.GodId and Panel_StockTableQty.Colid=@ColId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID And Panel_StockTable.LotId = @LotID and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End and Partyid=@PartyId And Trs_PcsGrn1.Id=@Id    

 End   
 
Else   

If @StageId<>1   

Begin  

if @ProcessType='R' 

begin 

UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty+@Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Panel_StockTable.Coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Panel_StockTable.StageId=@StageId1 And Panel_StockTable.GodId=Trs_PcsGrn1.GodId And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTable.PartId=@PartId And Panel_StockTableQty.ColId=@ColId And Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId WHERE Panel_StockTable.coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Panel_StockTable.StyleNo=@StyleNo and Panel_StockTable.LotID =@LotID and Panel_StockTable.Stageid=@StageId1 And Panel_StockTable.PartId=@PartId and Panel_StockTable.GodId=Trs_PcsGrn1.GodId and   Panel_StockTableQty.Colid=@ColId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID And Panel_StockTable.LotId = @LotID and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId and Partyid=@PartyId And Trs_PcsGrn1.Id=@Id   

end  

else  
print 'c'
begin  UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty+@Pcs From Panel_StockTableQty Inner Join  Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Panel_StockTable.Coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Panel_StockTable.StageId=@StageId1 And Panel_StockTable.GodId= Trs_PcsGrn1.GodId And Panel_StockTable.StyleNo=@StyleNo and Panel_StockTable.LotID =@LotID And Panel_StockTable.PartId=@PartId And Panel_StockTableQty.ColId=@ColId And Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 WHERE  Panel_StockTable.coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Panel_StockTable.StyleNo=@StyleNo and Panel_StockTable.LotID =@LotID and Panel_StockTable.Stageid=@StageId1 And Panel_StockTable.PartId=@PartId and Panel_StockTable.GodId=  Trs_PcsGrn1.GodId and Panel_StockTableQty.Colid=@ColId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and Partyid=@PartyId And Trs_PcsGrn1.Id=@Id  

end 

End  

End  

If @FinalStage='F'  

Begin  

If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId1)='Panel' 

Begin 

UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty-@Pcs,ProductionQty=Panel_StockTableQty.ProductionQty-@Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Panel_StockTable.Coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Panel_StockTable.StageId=Trs_PcsGrn1.TargetStageId And Panel_StockTable.GodId=Trs_PcsGrn1.GodId And Panel_StockTable.StyleNo=@StyleNo and Panel_StockTable.LotID =@LotID And Panel_StockTableQty.Colid=@ColId  And Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 WHERE Panel_StockTable.coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Panel_StockTable.StyleNo  =@StyleNo and Panel_StockTable.LotID =@LotID and Panel_StockTable.Stageid=Trs_PcsGrn1.TargetStageid and Panel_StockTable.GodId=Trs_PcsGrn1.GodId And Panel_StockTableQty.Colid=@ColId  and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and Partyid=0 And Trs_PcsGrn1.Id=@Id  

End 

 If @GrnType='Process Return' 

  Begin   
  
UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty-@Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Panel_StockTable.Coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Panel_StockTable.StageId=@StageId1 And Panel_StockTable.GodId=Trs_PcsGrn1.GodId And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTableQty.Colid=@ColId  And Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 WHERE Panel_StockTable.coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Panel_StockTable.StyleNo=@StyleNo and Panel_StockTable.LotID =@LotID and Panel_StockTable.Stageid=@StageId1 and Panel_StockTable.GodId=Trs_PcsGrn1.GodId And Panel_StockTableQty.Colid=@ColId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID and  IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End and Partyid=@PartyId And Trs_PcsGrn1.Id=@Id  

End  

Else  

Begin 

 If @StageId<>1  
 
Begin  

UPDATE  Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty+@Pcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Panel_StockTable.Coycode=Trs_PcsGrn1.Coycode And  Panel_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Panel_StockTable.StageId=@StageId1  And Panel_StockTable.GodId=Trs_PcsGrn1.GodId And Panel_StockTable.StyleNo=@StyleNo And Panel_StockTableQty.Colid=@ColId And Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID and IsNull(GoodPcsFlag,'G')='G'  and IsNull(RejectionTypeId,0)=0 WHERE Panel_StockTable.coycode=Trs_PcsGrn1.Coycode And Panel_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Panel_StockTable.StyleNo=@StyleNo and Panel_StockTable.LotID =@LotID and Panel_StockTable.Stageid=@StageId1 and Panel_StockTable.GodId= Trs_PcsGrn1.GodId And Panel_StockTableQty.Colid=@ColId  and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compID and IsNull(GoodPcsFlag,'G')='G' and  IsNull(RejectionTypeId,0)=0 and Partyid=@PartyId And Trs_PcsGrn1.Id=@Id  

End  

 End   

 End  
 
END    

FETCH NEXT FROM LINE_CURSOR_DEL INTO @Id,@StyleNo,@Colid,@PartId,@SizeId,@LotNo,@Pcs,@PanelId   ,@CompId 

EnD 

CLOSE LINE_CURSOR_DEL   

DEALLOCATE LINE_CURSOR_DEL    

SET NOCOUNT OFF  END 


