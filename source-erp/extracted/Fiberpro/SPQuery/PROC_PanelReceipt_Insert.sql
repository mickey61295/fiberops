/*;=============================================   
; Author           :  Global Software's    

; Create date      :  17/08/2022 
   
; Create By        :  ASLAM  

; Description      :  PANEL_Stock  

; Change Person    :  SWETHA

; Last Change Date :  05/07/2023 09.15 AM 

; =============================================  */  

CREATE PROCEDURE [PROC_PanelReceipt_Insert] (@Id Int,@StyleNo Varchar(20),@ColID Int,@PartId Int,@SizeId Int,@Pcs Int,@LotNo Varchar(15),@compId int) AS  DECLARE @Coycode int, @Partyid int,@Ordid int,@Stageid int,@GodId int,@SeqNo int,@StockQty int ,@SourceStageid int ,@GrnType varchar(20),@PcsStockId Int,@FinalStage Varchar(5),@StageId1 Int,@ProcessType Char(1),@RejectionTypeId Int ,@DCTargetStageID int ,@DcPartID Int  ,@LotId Int ,@SemiFinishDept Varchar(1) ,  @SourceStageid1 int  


SELECT @Coycode = Coycode From Trs_PcsGrn1 where id=@id    

SELECT @Partyid = Party from trs_Pcsgrn1 where id=@id    

SELECT @Ordid = OrdJob from Trs_PcsGrn1 where id=@id        

SELECT @StageId = TargetStageId FROM Trs_PcsGrn1 where id =@id  

SELECT @GodId = GodId FROM Trs_PcsGrn1 where id =@id      
SELECT @ProcessType = ProcessType FROM Trs_PcsGrn1 where id =@id  

IF ltrim(@LotNo)<>''  

SELECT @LotID = LotSno from mas_Lot where LotName =LTrim(@LotNo) 

ELSE 

SELECT @LotId = 0 

SELECT @RejectionTypeId = Trs_Pcs1.RejectionTypeId from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And  Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo and IsNull(Trs_Pcs2.CompID,0) =isnull(Trs_PcsGrn2.CompID,0) where Trs_PcsGrn1.id=@id 


SELECT @DcPartID = Trs_Pcs2.PartID from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo  And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID and Trs_Pcs2.SizeID = Trs_PcsGrn2.SizID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo and IsNull(Trs_Pcs2.CompID,0) =isnull(Trs_PcsGrn2.CompID,0) where Trs_PcsGrn1.id=@id   


Select @SeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@OrdId And Prod_Sequence.StyleNo=@StyleNo And Prod_Sequence.StageId=@Stageid 


   SELECT @SourceStageid = Trs_Pcs2.SourceStageId from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo and IsNull(Trs_Pcs2.CompID,0) =isnull(Trs_PcsGrn2.CompID,0) where Trs_PcsGrn1.id=@id  


/*



      SELECT @compId = ISNull(Trs_Pcs1.CompID,0) from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsG


rn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo where Trs_PcsGrn1.id=@id  







If @GrnType='Process Return'   



BEGIN



  SELECT DISTINCT @compId = ISNull(Trs_Pcs1.CompID,0) from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs


_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo where Trs_Pcs1.id=@id  



END



*/

print @compId

Print 'as1'

SELECT @StockQty = @Pcs   

Select @GrnType = GrnType from trs_pcsgrn1 where id=@id   

Select @FinalStage = Mas_Dept.SEMIFINISH From Mas_Dept Inner Join Mas_JobWrkComp On Mas_Dept.DeptID=Mas_JobWrkComp.DeptId Where Id=@StageId Select @SemiFinishDept=Mas_Dept.SEMIFINISH From Mas_Dept INNER JOIN Trs_PcsGrn1 ON Trs_PcsGrn1.Dept=Mas_Dept.DeptID Where Trs_PcsGrn1.ID=@Id 

If @GrnType='Process Return'     

BEGIN  /*Insert into tmp_trg Values ('START')*/      

If @SemiFinishDept='F'         

Select @StageId1 = Trs_Pcs1.TargetStageId From Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo and IsNull(Trs_Pcs2.CompID,0) =isnull(Trs_PcsGrn2.CompID,0)   Where Trs_PcsGrn1.id=@id      

 Else       

 Select @StageId1 = Trs_Pcs1.TargetStageId  From Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo and IsNull(Trs_Pcs2.CompID,0) =isnull(Trs_PcsGrn2.CompID,0) where Trs_PcsGrn1.id=@id      

 print @StageId1
 print '@StageId1'

END   

Else    

BEGIN   

print 'ttt'

Select @DCTargetStageID = Trs_Pcs1.TargetStageId from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.LotNo = Trs_PcsGrn2.LotNo and IsNull(Trs_Pcs2.CompID,0) =isnull(Trs_PcsGrn2.CompID,0) WHERE Trs_PcsGrn1.id=@id  /*
Insert into tmp_trg Values ('START1-Source ' + str(@DCTarget
StageID))  Insert into tmp_trg Valu
es ('START1') */  

print @DCTargetStageID
print '@DCTargetStageID'
SELECT @StageId1 = TargetStageId FROM Trs_PcsGrn1 where id =@id   /*Insert into tmp_trg Values ('START1 ' + str(@StageId1)) */    

END    

BEGIN  

If @FinalStage='S'    

BEGIN   /*Insert into tmp_trg Values ('START2')*/     

print 'ttt45565'

If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Panel' OR (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'

BEGIN   

if @ProcessType='R'   

BEGIN   

print 'ttt14555'

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty = Panel_StockTableQty.StockQty -@StockQty ,Panel_StockTableQty.ProductionQty =Panel_StockTableQty.ProductionQty+ @StockQty From Panel_StockTableQty  Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@Partyid and Panel_StockTableQty.ColId=@ColId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compId and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId   


End     

END  

If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Panel' OR (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Bit'   OR  (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'

If @GrnType='Process Return'  

BEGIN

select @StageId = Trs_Pcs2.SourceStageID from Trs_PcsGrn1 INNER JOIN Trs_Pcs1 ON Trs_PcsGrn1.Ourdcref = Trs_Pcs1.ID INNER JOIN Trs_Pcs2 ON Trs_Pcs2.ID = Trs_Pcs1.ID  where Trs_PcsGrn1.ID = @id and Trs_Pcs2.CompID = @compId

END

else 

BEGIN

SELECT @StageId = TargetStageId FROM Trs_PcsGrn1 where id =@id  

End


BEGIN   /*Insert into tmp_trg Values ('START3') */   

Print 'as2'

If EXISTS (select * from Panel_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=0)     


BEGIN    /*Insert into tmp_trg Values ('START4') */    


Print 'as3'


Select @PcsStockId=PcsStockId From Panel_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@StageId and PartId=@PartId and GodId=@GodId and PartyId=0     


If EXISTS (select * from Panel_StockTable Inner Join Panel_StockTableQty On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID  and Stageid=@StageId and PartId=@PartId and GodId=@GodId and PartyId=0 and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0) 

BegiN   /*Insert into tmp_trg Values ('START5')  Insert into tmp_trg Values ('UPDATE1 +' +str(@StockQty)) */  


Print 'as4'


Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty+@StockQty, Panel_StockTableQty.ProductionQty =Panel_StockTableQty.ProductionQty+@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID and Stageid=@StageId and PartId=@PartId and GodId=@GodId and PartyId=0 and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0    

print @coycode
print @Ordid
print @StyleNo
print @LotID
 print @PartId
 print @GodId
 print @Colid
 print @SizeId
 print @PcsStockId
 print '@PcsStockId'
 print @compId
 print'@compId'
 print @SourceStageid1
 print '@SourceStageid1'

if @ProcessType='R'   /*Insert into tmp_trg Values ('UPDATE55 -' + str(@Stockqty) )  */   

BEGIN   

Print 'as5'


Update Panel_StockTableQty Set Panel_StockTableQty.StockQty = Panel_StockTableQty.StockQty -@StockQty ,Panel_StockTableQty.ProductionQty =Panel_StockTableQty.ProductionQty+ @StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@Partyid and Panel_StockTableQty.ColId=@ColId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compId and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId   

End     

End      

Else     

Begin   /*Insert into tmp_trg Values ('INSERT1') */    


INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId,CompID) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0,@compId)     


End      

END         

Else      

begin 


Select @PcsStockId=IsNull(Max(PcsStockId)+1,0) From Panel_StockTable   /*Insert into tmp_trg Values ('INSERT2')*/   

INSERT INTO Panel_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID)   VALUES (@Coycode,@Ordid,@StyleNo,   @Stageid,@PartId,@SeqNo,@GodId,@PcsStockId,0,@LotID)  

INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId,CompID) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0,@compId)  


End   

END   

BEGIN  /*Insert into tmp_trg Values ('START6')*/   


Print 'as6'

Select @PcsStockId=PcsStockId From Panel_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@StageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId      

If @GrnType='Process Return'    

BEGIN   /*Insert into tmp_trg Values ('UPDATE2 -' + str(@StockQty)) */    

print '72555'


Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID and      Stageid=@StageId1 and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End      

END   

Else   

BEGIN   

if @ProcessType<>'R'  

BEGIN  /*Insert into tmp_trg Values ('UPDATE3 -' + str(@DCTargetStageID)) */ 	 


if @DCTargetStageID <> @StageId1   


BEGIN  /*Insert into tmp_trg Values ('UPDATE31 -' ) */  


Print 'as7'

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@StockQty From Panel_StockTableQty   Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID and Stageid=@DCTargetStageID and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and   Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0   

END  


Else    

begin  /*Insert into tmp_trg Values ('UPDATE32 -' ) */  

Print 'as8'

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotId and Stageid=@Stageid1 and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0   and Panel_StockTableQty.StockQty>0   

end 

END 

else 

BEGIN   

if @ProcessType<>'R' 

begin 

Print 'as9'

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty = Panel_StockTableQty.StockQty -@StockQty ,Panel_StockTableQty.ProductionQty =Panel_StockTableQty.ProductionQty+ @StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@Partyid and Panel_StockTableQty.ColId=@ColId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compId and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId    

 END
 
 END       

 END    

  END  

 END    

 If @FinalStage='F'   

 BEGIN   


If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId1)='Panel'   or (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId1)='Bit'     


 Begin       

  If EXISTS (select * from Panel_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotId and Stageid=@Stageid and GodId=@GodId and PartyId=0)    

 begin  


 Select @PcsStockId=PcsStockId From Panel_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID and Stageid=@Stageid and GodId=@GodId and PartyId=0     

If EXISTS (select * from Panel_StockTable Inner Join Panel_StockTableQty On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@Stageid and GodId=@GodId and PartyId=0 and Panel_StockTableQty.ColId=@ColId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0)  

 Begin  /*Insert into tmp_trg Values ('UPDATE155 +' + str(@Stockqty) )  */ 	

 print '9999'

 Update Panel_StockTableQty Set Panel_StockTableQty.StockQty = Panel_StockTableQty.StockQty +@StockQty ,Panel_StockTableQty.ProductionQty =Panel_StockTableQty.ProductionQty+ @StockQty	From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@Stageid and GodId=@GodId and PartyId=0 and Panel_StockTableQty.ColId=@ColId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0  


if @ProcessType='R'   /*Insert into tmp_trg Values ('UPDATE55 -' + str(@Stockqty) ) */ 

	begin 	 	


	print '88888'


	Update Panel_StockTableQty Set Panel_StockTableQty.StockQty = Panel_StockTableQty.StockQty -@StockQty , Panel_StockTableQty.ProductionQty =Panel_StockTableQty.ProductionQty+ @StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID	 and Stageid=@Stageid and GodId=@GodId and PartyId=@Partyid and Panel_StockTableQty.ColId=@ColId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compId and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId   and PartId=@PartId 

	
End   

End   

Else   

 Begin   

INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId,CompID) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0,@compId)   

End    

End  

Else   

begin   

Select @PcsStockId=ISnull(MAx(PcsstockID)+1,0) From Panel_StockTable   

INSERT INTO Panel_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID) VALUES (@Coycode,@Ordid,@StyleNo,@Stageid,@PartId,@SeqNo,@GodId,@PcsStockId,0,@LotID)

    INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId,CompID) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0,@compId)   


End  

End    

Begin   

Select @PcsStockId=PcsStockId From Panel_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and  LotID = @LotId and Stageid=@StageId and GodId=@GodId and PartyId=@PartyId    

If @GrnType='Process Return'     

Begin   

print 'ttt9999945'

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and Stageid=@StageId1 and LotId = @LotId and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@ColId and    Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P'  Then 0 Else @RejectionTypeId End  


End  

Else  


Begin   /*Insert into tmp_trg Values ('UPDATE555 -' + str(@Stockqty) )  Insert into tmp_trg Values ('UPDATE 555stage -' + str(@StageId1) )  Insert into tmp_trg Values ('UPDATE555stage -' + str(@DcPartID) ) Insert into tmp_trg Values ('UPDATE7555stage -' +

 str(@Partyid) )*/ 

If @FinalStage='F'     

begin     

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and  LotId = @LotID and Stageid=@StageId1 and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@ColId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and PartId=@DcPartID    end  

else     

print 'adfgtt'

begin Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=  @StyleNo and LotId = @LotID and Stageid=@StageId1 and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@ColId and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@compId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and PartId=@PartId   End  

End   

End   

End   


END 

