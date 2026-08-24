/*;=============================================   
; Author           :  Global Software's    
; Create date      :  10/09/2024    
; Create By        :  ASLAM  
; Description      :  PCS DELETE PROCEDURE
; Change Person    :  ASLAM
; Last Change Date :  11/01/2025 10.45 AM 
; =============================================  */  
CREATE PROCEDURE PROC_Stock_IssueToPrdn_Delete_FINISH (@Id Int) AS DECLARE @Coycode Int,@Ordid Int,@StyleNo Varchar(20),@StageId Int,@PartId Int,@GodId Int,@ColId Int,@SizeId Int,@StockQty Int,@SourceStageId Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int,@ProcessType Char(1),@RejectionTypeId Int ,@DelType Varchar(30),@FinishedStageID Int  ,@Pcs Int,@LotNo Varchar(15),@LotId int     ,@Prod_Without_Lot_Despatch_WithLot as char(1), @LotwiseStockReqd   char(1) ,@GAN_PCS Char(1)  ,@Knit_Woven_Both_OrderType as char(1), @GAN_RewrkFlg Char(1) ='N',@EmpID int ,@ReWork int


SELECT @LotwiseStockReqd = isNull(LotwiseStockReqd,'Y') from Options   
SELECT @Prod_Without_Lot_Despatch_WithLot = isNull(Prod_Without_Lot_Despatch_WithLot,'Y') from Options1     
Select @Coycode = Coycode FROM Trs_LineInput as trs_pcs1 where id=@id     
SELECT @Ordid = OrdJobNo from Trs_LineInput as trs_pcs1 where id=@id 
SELECT @LotwiseStockReqd = isNull(LotwiseStock,'Y') from Ordermas2 where Ordid=@Ordid   
SELECT @Stageid = TargetStageID from Trs_LineInput as trs_pcs1 where id=@id        
SELECT @GodId = GodId from Trs_LineInput as trs_pcs1 where id=@id        
SELECT @ProcessType = 'P' from Trs_LineInput as trs_pcs1 where id=@id        
SELECT @RejectionTypeId = 0 from Trs_LineInput as trs_pcs1 where id=@id       
Select @SeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@OrdId And Prod_Sequence.StyleNo=@StyleNo And Prod_Sequence.StageId=@Stageid  
SELECT @DelType = '' from Trs_LineInput as Trs_Pcs1 Where id =@Id         
SELECT @GAN_PCS = IsNull(GRNAcceptance_Pcs,'N') from Options
SELECT @Knit_Woven_Both_OrderType = IsNull(Knit_Woven_Both_OrderType,'K') From OrderMas Where ORdid = @Ordid 

if @GAN_PCS ='Y' and @Knit_Woven_Both_OrderType ='W' and @ProcessType ='R'
BEGIN
	SET @GAN_RewrkFlg ='Y'
END
select @EMPID = EMPID from Trs_LineInput as trs_pcs1 where id=@id    
if @DelType ='Sales'        
select @Partyid = 0  
 ELSE   
select @Partyid = 0 from Trs_LineInput as trs_pcs1 where id=@id        /* SELECT Top 1 @FinishedStageID = StageId  From Pcs_StockTable A INNER JO

IN Mas_JobWrkComp B ON A.StageId = B.ID INNER JOIN Mas_Dept C ON B.DeptId = C.DeptID INNER JOIN Trs_Pcs1 D ON A.ORdid = D.Ordjobno inner join (select distinct id,styleno from trs_pcs2 where id =@ID ) D1 on D.ID = D1.ID INNER JOIN Pcs_StockTableQty E ON a.PcsStockId = E.PcsStockId and a.Styleno = d1.StyleNo Where D.ID  = @ID And SEMIFINISH='F'       */    

BEGIN        
DECLARE LINE_CURSOR CURSOR FOR     
Select DISTINCT Trs_Pcs2.Id,StyleNo,Trs_Pcs2.Colid,Trs_Pcs2.PartId,SizeId,IsNull(lotNo,0) LotNo,Pcs,C.SourceStageId FROM Trs_LineInput_Det as Trs_Pcs2 INNER JOIN Trs_IsstoProd_SourceStageDtl C ON Trs_PCs2.ID = C.ID  Where Trs_Pcs2.ID=@Id
    OPEN LINE_CURSOR        
FETCH NEXT FROM LINE_CURSOR INTO @Id,@StyleNo,@Colid ,@PartId,@SizeId,@LotNo,@Pcs,@SourceStageId         

WHILE @@FETCH_STATUS = 0        
BEGIN  	     
if ltrim(@LotNo)<>''	     
 SELECT @LotID = LotSno from mas_Lot where LotName =LTrim(@LotNo)       
else       
SELECT @LotId = 0          
if Rtrim(@LotwiseStockReqd) ='N' And RTrim(@Prod_Without_Lot_Despatch_WithLot)='Y'   
BEGIN    
SELECT @LotId = 0   
END     
If @PartyId=0  and (@DelType='Despatch' Or @DelType ='Sales')       
Begin       	   
if @DelType ='Sales'  
begin  
SELECT Top 1 @FinishedStageID = @SourceStageId    
end  
else  
begin  
SELECT Top 1 @FinishedStageID = -3    
end 
print 'aaa'
 

UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@Pcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_LineInput as Trs_Pcs1 On Pcs_StockTable.Coycode=Trs_Pcs1.Coycode And Pcs_StockTable.OrdId=Trs_Pcs1.Ordjobno And Pcs_StockTable.StageId=@FinishedStageID And Pcs_StockTable.GodId=Trs_Pcs1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.PartId=@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty
.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 And Pcs_StockTable.LotId = @LotId WHERE Pcs_StockTable.coycode=Trs_Pcs1.Coycode And Pcs_StockTable.Ordid=Trs_Pcs1.Ordjobno and Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId = @LotId and Pcs_StockTable.Stageid=@FinishedStageID And Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId=Trs_Pcs1.GodId and Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 and Partyid=0 And Trs_Pcs1.Id=@Id     AND IsNull(Pcs_StockTable.EmpID,0) = 0   

End      

If (@PartyId<>0  OR @EmpID <> 0 )    and @DelType <> 'JobWork Return'     
Begin   /*Insert into tmp_trg Values ('START')*/   

print 'bbb'
UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty-@Pcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_LineInput as Trs_Pcs1 On Pcs_StockTable.Coycode=Trs_Pcs1.Coycode And Pcs_StockTable.OrdId=Trs_Pcs1.Ordjobno And Pcs_StockTable.StageId=Trs_Pcs1.TargetStageId  And Pcs_StockTable.GodId=Trs_Pcs1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId = @LotId And Pcs_StockTable.PartId=@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End WHERE Pcs_StockTable.coycode=Trs_Pcs1.Coycode And Pcs_StockTable.Ordid=Trs_Pcs1.Ordjobno and Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId = @LotId and Pcs_StockTable.Stageid=Trs_Pcs1.TargetStageid And Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId=Trs_Pcs1.GodId and Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')= Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End and Partyid=@PartyId And Trs_Pcs1.Id=@Id     AND IsNull(Pcs_StockTable.EmpID,0) = @EmpID     

End         


If @SourceStageid<>0 And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece' OR (Select Rtrim(IsNull(PcsType,'Piece')) From Mas_JobWrkComp Where Id=@StageId)='Bit'  Or (@Stageid=@SourceStageid)   

Begin  /*Insert into tmp_trg Values ('START1')*/     
If EXISTS (select * from Pcs_StockTable INNER JOIN Trs_IsstoProd_SourceStageDtl ON  Pcs_StockTable.PartId
 = Trs_IsstoProd_SourceStageDtl.PartId And Pcs_StockTable.StageId  = Trs_IsstoProd_SourceStageDtl.SourceStageId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and GodId=@GodId and PartyId=@PartyId and LotId = @LotID and PartyId=0 And IsNull(Pcs_StockTable.EmpID,0) = 0)    
BEGIN      
if @DelType<>'Supplier Receipt Rejection' 	  
BEGIN 	/*Insert into tmp_trg Values ('START2')*/ 
	  
Select @PcsStockId=PcsStockId From Pcs_StockTable INNER JOIN Trs_IsstoProd_SourceStageDtl ON  Pcs_StockTable.PartId = Trs_IsstoProd_SourceStageDtl.PartId And Pcs_StockTable.StageId  = Trs_IsstoProd_SourceStageDtl.SourceStageId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo  and GodId=@GodId and PartyId=0 and LotId = @LotID    And IsNull(Pcs_StockTable.EmpID,0) = 0 

IF @GAN_RewrkFlg='Y'
BEGIN
If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId INNER JOIN Trs_ProdEntry_SourceStageDtl ON
  Pcs_StockTable.PartId = Trs_ProdEntry_SourceStageDtl.PartId And Pcs_StockTable.StageId  = Trs_ProdEntry_SourceStageDtl.SourceStageId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.SizeId=@SizeId and LOTID = @LOTID and PartyId=0 And IsNull(Pcs_StockTable.EmpID,0) = 0  and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2)
 Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2)
 Then 0 Else @RejectionTypeId End)  	 	    
Begin  	/*Insert into tmp_trg Values ('START3')*/ 

print 'ccc'
 Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+(@Pcs*IsNull(OrderQtyDtl.PcsPerColor,1)) From Pcs_StockTableQty    Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId  INNER JOIN OrderQtyDtl on Pcs_StockTable.Ordid = OrderQtyDtl.Ordid And Pcs_StockTable.Styleno = OrderQtyDtl.StyleNo And OrderQtyDtl.ColId = Pcs_StockTableQty.Colid   And    OrderQtyDtl.SizeId = Pcs_StockTableQty.SizeId And OrderQtyDtl.PartId = Pcs_StockTable.PartID  LEFT OUTER JOIN Mas_Lot ON OrderQtyDtl.LotNo = Mas_Lot.LotName	 INNER JOIN Trs_IsstoProd_SourceStageDtl ON  Pcs_StockTable.PartId = Trs_IsstoProd_SourceStageDtl.PartId And    Pcs_StockTable.StageId  = Trs_IsstoProd_SourceStageDtl.SourceStageId where Trs_IsstoProd_SourceStageDtl.Id = @id and coycode=@coycode and Pcs_StockTable.Ordid=@Ordid and Pcs_StockTable.StyleNo=@StyleNo and LotID = @LotId and GodId=@GodId and PartyId=0   and IsNull(Pcs_StockTable.EmpID,0) = 0  And Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End   
End     

Else      
Begin 	/*Insert into tmp_trg Values ('START4')*/ 	 
if @GAN_RewrkFlg ='N'
 
INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When @ProcessType='P' Then 'G' Else 'M' End,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End)  	  
 End   
 END
 ELSE
BEGIN

If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId INNER JOIN Trs_IsstoProd_SourceStageDtl ON
  Pcs_StockTable.PartId = Trs_IsstoProd_SourceStageDtl.PartId And Pcs_StockTable.StageId  = Trs_IsstoProd_SourceStageDtl.SourceStageId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and GodId=@GodId and PartyId=@PartyId and Pcs_StockTableQty.SizeId=@SizeId and LOTID = @LOTID and PartyId=0 And IsNull(Pcs_StockTable.EmpID,0) = 0  and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2)
 Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2)
 Then 0 Else @RejectionTypeId End)  	    
Begin  	/*Insert into tmp_trg Values ('START3')*/ 

print 'ddd'

/* Test */
/* Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+(@Pcs*IsNull(OrderQtyDtl.PcsPerColor,1)) From Pcs_StockTableQty    Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId  INNER JOIN OrderQtyDtl on Pcs_StockTable.Ordid = OrderQtyDtl.Ordid And Pcs_StockTable.Styleno = OrderQtyDtl.StyleNo And OrderQtyDtl.ColId = Pcs_StockTableQty.Colid   And    OrderQtyDtl.SizeId = Pcs_StockTableQty.SizeId And OrderQtyDtl.PartId = Pcs_StockTable.PartID  LEFT OUTER JOIN Mas_Lot ON OrderQtyDtl.LotNo = Mas_Lot.LotName	 INNER JOIN Trs_IsstoProd_SourceStageDtl ON  Pcs_StockTable.PartId = Trs_IsstoProd_SourceStageDtl.PartId And    Pcs_StockTable.StageId  = Trs_IsstoProd_SourceStageDtl.SourceStageId where Trs_IsstoProd_SourceStageDtl.Id = @id and coycode=@coycode and Pcs_StockTable.Ordid=@Ordid and Pcs_StockTable.StyleNo=@StyleNo and LotID = @LotId and GodId=@GodId and PartyId=0   and IsNull(Pcs_StockTable.EmpID,0) = 0  And Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End  */

 Update Pcs_StockTableQty Set Pcs_StockTableQty.StockQty=Pcs_StockTableQty.StockQty+(@Pcs*IsNull(OrderQtyDtl.PcsPerColor,1)) From Pcs_StockTableQty    Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId  INNER JOIN OrderQtyDtl on Pcs_StockTable.Ordid = OrderQtyDtl.Ordid And Pcs_StockTable.Styleno = OrderQtyDtl.StyleNo And OrderQtyDtl.ColId = Pcs_StockTableQty.Colid   And    OrderQtyDtl.SizeId = Pcs_StockTableQty.SizeId And OrderQtyDtl.PartId = Pcs_StockTable.PartID  LEFT OUTER JOIN Mas_Lot ON OrderQtyDtl.LotNo = Mas_Lot.LotName	 INNER JOIN Trs_IsstoProd_SourceStageDtl ON  Pcs_StockTable.PartId = Trs_IsstoProd_SourceStageDtl.PartId And    Pcs_StockTable.StageId  = Trs_IsstoProd_SourceStageDtl.SourceStageId where Trs_IsstoProd_SourceStageDtl.Id = @id and coycode=@coycode and Pcs_StockTable.Ordid=@Ordid and Pcs_StockTable.StyleNo=@StyleNo and LotID = @LotId and GodId=@GodId and PartyId=0   and IsNull(Pcs_StockTable.EmpID,0) = 0  And Pcs_StockTableQty.SizeId=@SizeId and IsNull(Pcs_StockTableQty.GoodPcsFlag,'G')=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When (IsNull(@Rework,0)=0 OR IsNull(@Rework,0)=2) Then 0 Else @RejectionTypeId End  And OrderQtyDtl.CmbClrID = @ColId



End     

Else      
Begin 	/*Insert into tmp_trg Values ('START4')*/ 	 
if @GAN_RewrkFlg ='N'
 
INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When @ProcessType='P' Then 'G' Else 'M' End,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End)  	  
 End    
 END
End    
 Else    
 Begin /*Supplier Receipt Rejection */ 	/*Insert into tmp_trg Values ('START21')*/ 	   

Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotID = @Lotid and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=0   AND IsNull(EmpID,0) = 0 	    

If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotID = @LotID and Stageid=@SourceStageid and PartId=@PartId and GodId=@GodId and PartyId=0 and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId AND IsNull(Pcs_StockTable.EmpID,0) = 0  and IsNull(GoodPcsFlag,'G')= 'G' and IsNull(RejectionTypeId,0)=0)      

 Begin /*Insert into tmp_trg Values ('START31')*/ 		   

 print 'eee'
UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@Pcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_LineInput as Trs_Pcs1 On Pcs_StockTable.Coycode=Trs_Pcs1.Coycode And Pcs_StockTable.OrdId=Trs_Pcs1.Ordjobno And Pcs_StockTable.GodId=Trs_Pcs1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId = @LotId And Pcs_StockTable.PartId=@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 WHERE Pcs_StockTable.coycode=Trs_Pcs1.Coycode And Pcs_StockTable.Ordid=Trs_Pcs1.Ordjobno and Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId = @LotId And Pcs_StockTable.PartId=@PartId and  Pcs_StockTable.GodId=Trs_Pcs1.GodId and Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 and Partyid=0 And Pcs_StockTable.StageId=@SourceStageId And Trs_Pcs1.Id=@Id  	   AND IsNull(Pcs_StockTable.EmpID,0) = 0 

End  	  

Else     

Begin /*Insert into tmp_trg Values ('START41')*/ 	
print 'x'
INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When @ProcessType='P' Then 'G' Else 'M' End,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End)  

End   
End   
End    
Else    
Begin  /*Insert into tmp_trg Values ('START5')*/      
Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Pcs_StockTable     
print 'y'
INSERT INTO Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID,EmpID) VALUES (@Coycode,@Ordid,@StyleNo,@Stageid,@PartId,@SeqNo,@GodId,@PcsStockId,0,@LotID,@EmpID)      



INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When @ProcessType='P' Then 'G' Else 'M' End,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End)    

 End     
 End      
 FETCH NEXT FROM LINE_CURSOR INTO @Id,@StyleNo,@Colid,@PartId,@SizeId,@LotNo,@Pcs,@SourceStageId       
END         
CLOSE LINE_CURSOR        
DEALLOCATE LINE_CURSOR           
SET NOCOUNT OFF    
END 